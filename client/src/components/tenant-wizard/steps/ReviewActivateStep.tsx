import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, User, Building2, Crown, Zap, Calendar, Phone, Settings, Loader2 } from "lucide-react";

interface ReviewActivateStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onComplete: () => void;
  onPrevious: () => void;
  isCreating: boolean;
}

export default function ReviewActivateStep({ data, onUpdate, onComplete, onPrevious, isCreating }: ReviewActivateStepProps) {
  
  const getBusinessTemplateName = () => {
    const templates = {
      medical: "🏥 Medical Practice",
      salon: "💅 Salon & Beauty", 
      restaurant: "🍽️ Restaurant & Dining",
      consultant: "💼 Professional Services",
      general: "🏢 General Business",
      custom: "⚙️ Custom Template"
    };
    return templates[data.businessTemplate as keyof typeof templates] || "General Business";
  };

  const getEnabledFeatures = () => {
    const features = [];
    if (data.premiumAccess) features.push("Premium Access");
    if (data.hipaaCompliant) features.push("HIPAA Compliance");
    if (data.customBranding) features.push("Custom Branding");
    if (data.apiAccess) features.push("API Access");
    return features.concat(data.featuresEnabled || []);
  };

  const getIntegrationStatus = () => {
    const integrations = [];
    if (data.retellConfig) {
      integrations.push({
        name: "Retell Voice AI",
        status: "configured",
        details: `Agent ID: ${data.retellConfig.agentId}`
      });
    }
    if (data.calendarConfig) {
      integrations.push({
        name: `${data.calendarConfig.type === 'calcom' ? 'Cal.com' : 'Calendly'} Calendar`,
        status: "configured", 
        details: data.calendarConfig.type === 'calcom' 
          ? `Event Type ID: ${data.calendarConfig.eventTypeId}`
          : `Organizer: ${data.calendarConfig.organizerEmail}`
      });
    }
    return integrations;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Review & Activate Tenant</h3>
        <p className="text-muted-foreground">
          Review all configuration details before activating the new tenant
        </p>
      </div>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Building2 className="w-5 h-5" />
            <span>Business Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business Name:</span>
            <span className="font-medium" data-testid="review-business-name">{data.businessName}</span>
          </div>
          {data.companyName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Company Name:</span>
              <span className="font-medium">{data.companyName}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Contact Email:</span>
            <span className="font-medium">{data.contactEmail}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business Template:</span>
            <Badge variant="secondary" data-testid="review-business-template">
              {getBusinessTemplateName()}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Administrator Account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Administrator Account</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Admin Name:</span>
            <span className="font-medium" data-testid="review-admin-name">{data.adminUser?.fullName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Admin Email:</span>
            <span className="font-medium">{data.adminUser?.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role:</span>
            <Badge className="bg-blue-100 text-blue-800">Client Administrator</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Feature Access */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Crown className="w-5 h-5" />
            <span>Feature Access</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getEnabledFeatures().length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {getEnabledFeatures().map((feature) => (
                <Badge key={feature} variant="secondary" data-testid={`review-feature-${feature.toLowerCase().replace(' ', '-')}`}>
                  {feature}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Standard features only</p>
          )}
        </CardContent>
      </Card>

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>Integrations</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {getIntegrationStatus().length > 0 ? (
            <div className="space-y-3">
              {getIntegrationStatus().map((integration) => (
                <div key={integration.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {integration.name.includes('Voice') ? (
                      <Phone className="w-4 h-4 text-primary" />
                    ) : (
                      <Calendar className="w-4 h-4 text-primary" />
                    )}
                    <span className="font-medium">{integration.name}</span>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-800">Configured</Badge>
                    <p className="text-xs text-muted-foreground mt-1">{integration.details}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No integrations configured (can be set up later)</p>
          )}
        </CardContent>
      </Card>

      {/* Business Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="w-5 h-5" />
            <span>Business Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Timezone:</span>
            <span className="font-medium">{data.timezone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Business Hours:</span>
            <span className="font-medium">
              {data.businessHours?.start} - {data.businessHours?.end}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Max Calls/Day:</span>
            <span className="font-medium">{data.operationalSettings?.maxCallsPerDay}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Quiet Hours:</span>
            <span className="font-medium">
              {data.operationalSettings?.quietStart} - {data.operationalSettings?.quietEnd}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Final Actions */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-green-900">Ready to Activate</h4>
              <p className="text-xs text-green-700 mt-1">
                All configuration is complete. The tenant will be created with the settings above 
                and the administrator will receive login credentials via email.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} disabled={isCreating} data-testid="button-previous-review">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={onComplete} 
          disabled={isCreating}
          className="bg-green-600 hover:bg-green-700"
          data-testid="button-activate-tenant"
        >
          {isCreating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Tenant...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Activate Tenant
            </>
          )}
        </Button>
      </div>
    </div>
  );
}