import { useState, useEffect } from "react";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

// Tenant Settings Editor Component
interface TenantSettingsEditorProps {
  tenantToEdit: Tenant | null;
  isOpen: boolean;
  onClose: () => void;
}

function TenantSettingsEditor({ tenantToEdit, isOpen, onClose }: TenantSettingsEditorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("retell");
  const [formData, setFormData] = useState<any>({});

  // Fetch tenant configuration
  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['/api/admin/tenants', tenantToEdit?.id, 'config'],
    queryFn: async () => {
      if (!tenantToEdit?.id) return null;
      const response = await apiRequest('GET', `/api/admin/tenants/${tenantToEdit.id}/config`);
      return response.json();
    },
    enabled: !!tenantToEdit?.id && isOpen,
  });

  // Update form data when config loads
  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  // Update tenant config mutation
  const updateConfigMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!tenantToEdit?.id) throw new Error('No tenant selected');
      await apiRequest('PATCH', `/api/admin/tenants/${tenantToEdit.id}/config`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants', tenantToEdit?.id, 'config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
      toast({
        title: "Settings updated",
        description: "Tenant configuration has been updated successfully.",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateConfigMutation.mutate(formData);
  };

  if (!tenantToEdit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Tenant Settings: {tenantToEdit.name}</DialogTitle>
        </DialogHeader>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Loading settings...</span>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="retell">Retell AI</TabsTrigger>
              <TabsTrigger value="calendar">Calendar</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="features">Features</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {/* Retell AI Configuration */}
              <TabsContent value="retell" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="retellAgentId">Retell Agent ID</Label>
                    <Input
                      id="retellAgentId"
                      value={formData.retellAgentId || ''}
                      onChange={(e) => handleInputChange('retellAgentId', e.target.value)}
                      placeholder="agent_xxxxxxxxxx"
                      data-testid="input-retell-agent-id"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retellAgentNumber">Retell Agent Number</Label>
                    <Input
                      id="retellAgentNumber"
                      value={formData.retellAgentNumber || ''}
                      onChange={(e) => handleInputChange('retellAgentNumber', e.target.value)}
                      placeholder="+1234567890"
                      data-testid="input-retell-agent-number"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retellApiKey">Retell API Key</Label>
                    <Input
                      id="retellApiKey"
                      type="password"
                      value={formData.retellApiKey || ''}
                      onChange={(e) => handleInputChange('retellApiKey', e.target.value)}
                      placeholder="key_xxxxxxxxxx"
                      data-testid="input-retell-api-key"
                    />
                  </div>
                  <div>
                    <Label htmlFor="retellWebhookSecret">Retell Webhook Secret</Label>
                    <Input
                      id="retellWebhookSecret"
                      type="password"
                      value={formData.retellWebhookSecret || ''}
                      onChange={(e) => handleInputChange('retellWebhookSecret', e.target.value)}
                      placeholder="whsec_xxxxxxxxxx"
                      data-testid="input-retell-webhook-secret"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Calendar Integration */}
              <TabsContent value="calendar" className="space-y-6 mt-0">
                <div>
                  <h4 className="font-semibold mb-3">Cal.com Integration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calApiKey">Cal.com API Key</Label>
                      <Input
                        id="calApiKey"
                        type="password"
                        value={formData.calApiKey || ''}
                        onChange={(e) => handleInputChange('calApiKey', e.target.value)}
                        placeholder="cal_live_xxxxxxxxxx"
                        data-testid="input-cal-api-key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calEventTypeId">Cal.com Event Type ID</Label>
                      <Input
                        id="calEventTypeId"
                        type="number"
                        value={formData.calEventTypeId || ''}
                        onChange={(e) => handleInputChange('calEventTypeId', e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="123456"
                        data-testid="input-cal-event-type-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calWebhookSecret">Cal.com Webhook Secret</Label>
                      <Input
                        id="calWebhookSecret"
                        type="password"
                        value={formData.calWebhookSecret || ''}
                        onChange={(e) => handleInputChange('calWebhookSecret', e.target.value)}
                        placeholder="whsec_xxxxxxxxxx"
                        data-testid="input-cal-webhook-secret"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Calendly Integration</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="calendlyApiKey">Calendly API Key</Label>
                      <Input
                        id="calendlyApiKey"
                        type="password"
                        value={formData.calendlyApiKey || ''}
                        onChange={(e) => handleInputChange('calendlyApiKey', e.target.value)}
                        placeholder="xxxxxxxxxx"
                        data-testid="input-calendly-api-key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendlyAccessToken">Calendly Access Token</Label>
                      <Input
                        id="calendlyAccessToken"
                        type="password"
                        value={formData.calendlyAccessToken || ''}
                        onChange={(e) => handleInputChange('calendlyAccessToken', e.target.value)}
                        placeholder="xxxxxxxxxx"
                        data-testid="input-calendly-access-token"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendlyOrganization">Calendly Organization</Label>
                      <Input
                        id="calendlyOrganization"
                        value={formData.calendlyOrganization || ''}
                        onChange={(e) => handleInputChange('calendlyOrganization', e.target.value)}
                        placeholder="https://api.calendly.com/organizations/xxx"
                        data-testid="input-calendly-organization"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendlyUser">Calendly User</Label>
                      <Input
                        id="calendlyUser"
                        value={formData.calendlyUser || ''}
                        onChange={(e) => handleInputChange('calendlyUser', e.target.value)}
                        placeholder="https://api.calendly.com/users/xxx"
                        data-testid="input-calendly-user"
                      />
                    </div>
                    <div>
                      <Label htmlFor="calendlyWebhookSecret">Calendly Webhook Secret</Label>
                      <Input
                        id="calendlyWebhookSecret"
                        type="password"
                        value={formData.calendlyWebhookSecret || ''}
                        onChange={(e) => handleInputChange('calendlyWebhookSecret', e.target.value)}
                        placeholder="whsec_xxxxxxxxxx"
                        data-testid="input-calendly-webhook-secret"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Business Settings */}
              <TabsContent value="business" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input
                      id="timezone"
                      value={formData.timezone || 'Europe/London'}
                      onChange={(e) => handleInputChange('timezone', e.target.value)}
                      placeholder="Europe/London"
                      data-testid="input-timezone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="followUpHours">Follow-up Hours</Label>
                    <Input
                      id="followUpHours"
                      type="number"
                      value={formData.followUpHours || 24}
                      onChange={(e) => handleInputChange('followUpHours', parseInt(e.target.value))}
                      min="1"
                      max="168"
                      data-testid="input-follow-up-hours"
                    />
                  </div>
                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select
                      value={formData.businessType || 'professional'}
                      onValueChange={(value) => handleInputChange('businessType', value)}
                    >
                      <SelectTrigger data-testid="select-business-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                        <SelectItem value="professional">Professional Services</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="followUpRetryMinutes">Follow-up Retry (Minutes)</Label>
                    <Input
                      id="followUpRetryMinutes"
                      type="number"
                      value={formData.followUpRetryMinutes || 90}
                      onChange={(e) => handleInputChange('followUpRetryMinutes', parseInt(e.target.value))}
                      min="15"
                      max="1440"
                      data-testid="input-follow-up-retry-minutes"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxCallsPerDay">Max Calls Per Day</Label>
                    <Input
                      id="maxCallsPerDay"
                      type="number"
                      value={formData.maxCallsPerDay || 200}
                      onChange={(e) => handleInputChange('maxCallsPerDay', parseInt(e.target.value))}
                      min="50"
                      max="1000"
                      data-testid="input-max-calls-per-day"
                    />
                  </div>
                  <div>
                    <Label htmlFor="maxCallsPer15Min">Max Calls Per 15 Min</Label>
                    <Input
                      id="maxCallsPer15Min"
                      type="number"
                      value={formData.maxCallsPer15Min || 25}
                      onChange={(e) => handleInputChange('maxCallsPer15Min', parseInt(e.target.value))}
                      min="5"
                      max="100"
                      data-testid="input-max-calls-per-15-min"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quietStart">Quiet Hours Start</Label>
                    <Input
                      id="quietStart"
                      type="time"
                      value={formData.quietStart || '20:00'}
                      onChange={(e) => handleInputChange('quietStart', e.target.value)}
                      data-testid="input-quiet-start"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quietEnd">Quiet Hours End</Label>
                    <Input
                      id="quietEnd"
                      type="time"
                      value={formData.quietEnd || '08:00'}
                      onChange={(e) => handleInputChange('quietEnd', e.target.value)}
                      data-testid="input-quiet-end"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Feature Toggles */}
              <TabsContent value="features" className="space-y-6 mt-0">
                <div>
                  <h4 className="font-semibold mb-4">Core Premium Features</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">Premium Access</h5>
                        <p className="text-sm text-muted-foreground mt-1">Unlock all premium features for this tenant</p>
                      </div>
                      <Switch
                        checked={formData.premiumAccess || false}
                        onCheckedChange={(checked) => handleInputChange('premiumAccess', checked)}
                        data-testid="switch-premium-access"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">HIPAA Compliance</h5>
                        <p className="text-sm text-muted-foreground mt-1">Enable HIPAA compliance features for healthcare</p>
                      </div>
                      <Switch
                        checked={formData.hipaaCompliant || false}
                        onCheckedChange={(checked) => handleInputChange('hipaaCompliant', checked)}
                        data-testid="switch-hipaa-compliant"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">Custom Branding</h5>
                        <p className="text-sm text-muted-foreground mt-1">Allow white-labeling with custom logos and brand colors</p>
                      </div>
                      <Switch
                        checked={formData.customBranding || false}
                        onCheckedChange={(checked) => handleInputChange('customBranding', checked)}
                        data-testid="switch-custom-branding"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h5 className="font-medium text-foreground">API Access</h5>
                        <p className="text-sm text-muted-foreground mt-1">Grant full API access for integrations</p>
                      </div>
                      <Switch
                        checked={formData.apiAccess || false}
                        onCheckedChange={(checked) => handleInputChange('apiAccess', checked)}
                        data-testid="switch-api-access"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-4">Additional Features</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('advancedAnalytics') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('advancedAnalytics')
                          ? features.filter((f: string) => f !== 'advancedAnalytics')
                          : [...features, 'advancedAnalytics'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Advanced Analytics & Reporting</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('advancedAnalytics')}
                        onCheckedChange={() => {}}
                        data-testid="switch-advanced-analytics"
                      />
                    </div>

                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('bulkOperations') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('bulkOperations')
                          ? features.filter((f: string) => f !== 'bulkOperations')
                          : [...features, 'bulkOperations'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Bulk Contact Operations</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('bulkOperations')}
                        onCheckedChange={() => {}}
                        data-testid="switch-bulk-operations"
                      />
                    </div>

                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('multiLocation') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('multiLocation')
                          ? features.filter((f: string) => f !== 'multiLocation')
                          : [...features, 'multiLocation'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Multi-Location Support</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('multiLocation')}
                        onCheckedChange={() => {}}
                        data-testid="switch-multi-location"
                      />
                    </div>

                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('customFields') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('customFields')
                          ? features.filter((f: string) => f !== 'customFields')
                          : [...features, 'customFields'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Custom Contact Fields</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('customFields')}
                        onCheckedChange={() => {}}
                        data-testid="switch-custom-fields"
                      />
                    </div>

                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('advancedScheduling') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('advancedScheduling')
                          ? features.filter((f: string) => f !== 'advancedScheduling')
                          : [...features, 'advancedScheduling'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Advanced Scheduling Rules</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('advancedScheduling')}
                        onCheckedChange={() => {}}
                        data-testid="switch-advanced-scheduling"
                      />
                    </div>

                    <div 
                      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                        (formData.featuresEnabled || []).includes('prioritySupport') ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => {
                        const features = formData.featuresEnabled || [];
                        const newFeatures = features.includes('prioritySupport')
                          ? features.filter((f: string) => f !== 'prioritySupport')
                          : [...features, 'prioritySupport'];
                        handleInputChange('featuresEnabled', newFeatures);
                      }}
                    >
                      <span className="text-sm font-medium">Priority Customer Support</span>
                      <Switch
                        checked={(formData.featuresEnabled || []).includes('prioritySupport')}
                        onCheckedChange={() => {}}
                        data-testid="switch-priority-support"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-settings">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={updateConfigMutation.isPending || isLoadingConfig}
            data-testid="button-save-settings"
          >
            {updateConfigMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
  const [displayCount, setDisplayCount] = useState(10); // Show 10 tenants initially
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);

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
      console.log('Full impersonation response:', response); // Debug log
      
      // Handle the response format from backend: { impersonationToken, tenant, ... }
      const token = response?.impersonationToken;
      const tenant = response?.tenant;
      
      console.log('Extracted token:', token ? 'Present' : 'Missing');
      console.log('Extracted tenant:', tenant);
      
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
      console.log('Storing token in localStorage...');
      localStorage.setItem('auth_token', token);
      console.log('Token stored. Current localStorage token:', localStorage.getItem('auth_token') ? 'Present' : 'Missing');
      
      // Test the token immediately
      console.log('Testing token with auth endpoint...');
      try {
        const testResponse = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('Auth test response status:', testResponse.status);
        const authData = await testResponse.json();
        console.log('Auth test response data:', authData);
      } catch (error) {
        console.error('Auth test failed:', error);
      }
      
      toast({
        title: "Visiting Tenant",
        description: `Now acting as admin for ${tenant.name}. You can make changes on their behalf.`,
      });
      
      // Redirect to root (/) which provides the layout wrapper (Sidebar + Header)
      // The Dashboard component will detect client_admin role and render ClientAdminDashboard
      window.location.href = '/';
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

  const handleEditSettings = (tenant: Tenant) => {
    setTenantToEdit(tenant);
    setIsSettingsModalOpen(true);
  };

  const confirmDeleteTenant = () => {
    if (tenantToDelete) {
      deleteTenantMutation.mutate(tenantToDelete);
    }
  };

  // Reset display count when search query changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setDisplayCount(10); // Reset to show first 10 when searching
  };

  const allTenants = searchQuery.length > 2 ? searchResults : tenants;
  const displayedTenants = allTenants.slice(0, displayCount);
  const hasMore = allTenants.length > displayCount;

  const loadMore = () => {
    setDisplayCount(prev => prev + 10);
  };

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
                      onChange={(e) => handleSearchChange(e.target.value)}
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
                                onClick={() => handleEditSettings(tenant)}
                                className="text-muted-foreground hover:text-primary transition-colors"
                                data-testid={`button-edit-settings-${tenant.id}`}
                                title="Edit tenant settings"
                              >
                                <i className="fas fa-cog text-sm"></i>
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
              
              {/* Load More Button */}
              {hasMore && !isLoading && displayedTenants.length > 0 && (
                <div className="flex justify-center py-6 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    data-testid="button-load-more-tenants"
                    className="px-6"
                  >
                    <i className="fas fa-chevron-down mr-2"></i>
                    Load More ({allTenants.length - displayCount} remaining)
                  </Button>
                </div>
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

          {/* Tenant Settings Editor */}
          <TenantSettingsEditor
            tenantToEdit={tenantToEdit}
            isOpen={isSettingsModalOpen}
            onClose={() => {
              setIsSettingsModalOpen(false);
              setTenantToEdit(null);
            }}
          />
        </main>
      </div>
    </div>
  );
}
