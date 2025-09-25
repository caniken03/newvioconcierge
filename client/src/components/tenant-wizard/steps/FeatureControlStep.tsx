import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Shield, Crown, Palette, Code, BarChart3, Zap } from "lucide-react";

const PREMIUM_FEATURES = [
  {
    id: 'premiumAccess',
    title: 'Premium Access',
    icon: Crown,
    description: 'Unlock all premium features and capabilities',
    benefits: ['Priority Support', 'Advanced Features', 'Enhanced Limits'],
    recommended: true,
  },
  {
    id: 'hipaaCompliant',
    title: 'HIPAA Compliance',
    icon: Shield,
    description: 'Enable HIPAA compliance features for healthcare',
    benefits: ['Patient Privacy Protection', 'Secure Data Handling', 'Compliance Reporting'],
    requiredFor: ['medical'],
  },
  {
    id: 'customBranding',
    title: 'Custom Branding',
    icon: Palette,
    description: 'White-label solution with custom branding',
    benefits: ['Custom Logo', 'Brand Colors', 'Personalized Experience'],
    premium: true,
  },
  {
    id: 'apiAccess',
    title: 'API Access',
    icon: Code,
    description: 'Full API access for integrations and automation',
    benefits: ['REST API Access', 'Webhook Support', 'Custom Integrations'],
    premium: true,
  },
];

const ADDITIONAL_FEATURES = [
  { id: 'advancedAnalytics', label: 'Advanced Analytics & Reporting', icon: BarChart3 },
  { id: 'bulkOperations', label: 'Bulk Contact Operations', icon: Zap },
  { id: 'multiLocation', label: 'Multi-Location Support', icon: Shield },
  { id: 'customFields', label: 'Custom Contact Fields', icon: Code },
  { id: 'advancedScheduling', label: 'Advanced Scheduling Rules', icon: Crown },
  { id: 'prioritySupport', label: 'Priority Customer Support', icon: Shield },
];

interface FeatureControlStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function FeatureControlStep({ data, onUpdate, onNext, onPrevious }: FeatureControlStepProps) {
  const [features, setFeatures] = useState({
    premiumAccess: data.premiumAccess || false,
    hipaaCompliant: data.hipaaCompliant || false,
    customBranding: data.customBranding || false,
    apiAccess: data.apiAccess || false,
  });
  
  const [additionalFeatures, setAdditionalFeatures] = useState<string[]>(data.featuresEnabled || []);

  const handleFeatureToggle = (featureId: string) => {
    const newFeatures = { ...features, [featureId]: !features[featureId as keyof typeof features] };
    setFeatures(newFeatures);
  };

  const handleAdditionalFeatureToggle = (featureId: string) => {
    const newAdditionalFeatures = additionalFeatures.includes(featureId)
      ? additionalFeatures.filter(id => id !== featureId)
      : [...additionalFeatures, featureId];
    setAdditionalFeatures(newAdditionalFeatures);
  };

  const handleNext = () => {
    onUpdate({
      ...features,
      featuresEnabled: additionalFeatures,
    });
    onNext();
  };

  // Auto-enable HIPAA for medical businesses
  const isHipaaRequired = data.businessTemplate === 'medical';
  if (isHipaaRequired && !features.hipaaCompliant) {
    setFeatures(prev => ({ ...prev, hipaaCompliant: true }));
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Crown className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Feature Access Control</h3>
        <p className="text-muted-foreground">
          Configure which premium features this tenant will have access to
        </p>
      </div>

      {data.businessTemplate === 'medical' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <p className="text-sm text-amber-800">
              <strong>Medical Business Detected:</strong> HIPAA compliance has been automatically enabled for this healthcare tenant.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Core Premium Features</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {PREMIUM_FEATURES.map((feature) => {
            const IconComponent = feature.icon;
            const isEnabled = features[feature.id as keyof typeof features];
            const isRequired = feature.requiredFor?.includes(data.businessTemplate);
            
            return (
              <div 
                key={feature.id}
                className={`flex items-start justify-between p-4 border rounded-lg ${
                  isRequired ? 'border-amber-200 bg-amber-50' : 'border-border'
                }`}
              >
                <div className="flex items-start space-x-3 flex-1">
                  <IconComponent className="w-5 h-5 text-primary mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-medium text-foreground">{feature.title}</h4>
                      {feature.recommended && (
                        <Badge variant="secondary" className="text-xs">Recommended</Badge>
                      )}
                      {isRequired && (
                        <Badge className="text-xs bg-amber-100 text-amber-800">Required</Badge>
                      )}
                      {feature.premium && (
                        <Badge variant="outline" className="text-xs">Premium</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{feature.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {feature.benefits.map((benefit) => (
                        <Badge key={benefit} variant="secondary" className="text-xs">
                          {benefit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <Switch
                  checked={isEnabled}
                  onCheckedChange={() => handleFeatureToggle(feature.id)}
                  disabled={isRequired}
                  data-testid={`switch-${feature.id}`}
                />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Additional Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ADDITIONAL_FEATURES.map((feature) => {
              const IconComponent = feature.icon;
              const isEnabled = additionalFeatures.includes(feature.id);
              
              return (
                <div 
                  key={feature.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    isEnabled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => handleAdditionalFeatureToggle(feature.id)}
                  data-testid={`feature-${feature.id}`}
                >
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">{feature.label}</span>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => handleAdditionalFeatureToggle(feature.id)}
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} data-testid="button-previous-features">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button onClick={handleNext} data-testid="button-next-features">
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}