import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, ArrowLeft, ArrowRight } from "lucide-react";

// Step Components
import BusinessDiscoveryStep from "./steps/BusinessDiscoveryStep";
import TemplateSelectionStep from "./steps/TemplateSelectionStep";
import FeatureControlStep from "./steps/FeatureControlStep";
import AdminSetupStep from "./steps/AdminSetupStep";
import IntegrationConfigStep from "./steps/IntegrationConfigStep";
import BusinessConfigStep from "./steps/BusinessConfigStep";
import ReviewActivateStep from "./steps/ReviewActivateStep";

interface WizardData {
  // Step 1: Business Discovery
  businessName: string;
  companyName?: string;
  contactEmail: string;
  
  // Step 2: Template Selection
  businessTemplate: 'medical' | 'salon' | 'restaurant' | 'consultant' | 'general' | 'custom';
  
  // Step 3: Feature Control
  premiumAccess: boolean;
  hipaaCompliant: boolean;
  customBranding: boolean;
  apiAccess: boolean;
  featuresEnabled: string[];
  
  // Step 4: Admin Setup
  adminUser: {
    email: string;
    fullName: string;
    password: string;
  };
  
  // Step 5: Integration Config
  retellConfig?: {
    agentId?: string;
    phoneNumber?: string;
  };
  calendarConfig?: {
    type: 'calcom' | 'calendly';
    apiKey?: string;
    webhookSecret?: string;
    eventTypeId?: number;
    organizerEmail?: string;
  };
  
  // Step 6: Business Config
  timezone: string;
  businessHours: {
    start: string;
    end: string;
  };
  operationalSettings: {
    maxCallsPerDay: number;
    maxCallsPer15Min: number;
    quietStart: string;
    quietEnd: string;
  };
}

const WIZARD_STEPS = [
  { id: 1, title: "Business Discovery", description: "Basic business information" },
  { id: 2, title: "Template Selection", description: "Choose business template" },
  { id: 3, title: "Feature Access", description: "Configure premium features" },
  { id: 4, title: "Admin Setup", description: "Create administrator account" },
  { id: 5, title: "Integration Config", description: "Voice AI & Calendar setup" },
  { id: 6, title: "Business Rules", description: "Operational configuration" },
  { id: 7, title: "Review & Activate", description: "Final review and launch" },
];

interface TenantSetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function TenantSetupWizard({ isOpen, onClose, onComplete }: TenantSetupWizardProps) {
  const STORAGE_KEY = 'vioconcierge_wizard_data';
  const STEP_STORAGE_KEY = 'vioconcierge_wizard_step';
  
  // Initial wizard data
  const getInitialWizardData = (): WizardData => ({
    businessName: "",
    contactEmail: "",
    businessTemplate: "general",
    premiumAccess: false,
    hipaaCompliant: false,
    customBranding: false,
    apiAccess: false,
    featuresEnabled: [],
    adminUser: {
      email: "",
      fullName: "",
      password: "",
    },
    timezone: "Europe/London",
    businessHours: {
      start: "09:00",
      end: "17:00",
    },
    operationalSettings: {
      maxCallsPerDay: 300,
      maxCallsPer15Min: 20,
      quietStart: "20:00",
      quietEnd: "08:00",
    },
  });
  
  // Load persisted data or use initial data
  const getPersistedData = (): WizardData => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load persisted wizard data:', error);
    }
    return getInitialWizardData();
  };
  
  const getPersistedStep = (): number => {
    try {
      const stored = sessionStorage.getItem(STEP_STORAGE_KEY);
      if (stored) {
        return parseInt(stored, 10);
      }
    } catch (error) {
      console.error('Failed to load persisted step:', error);
    }
    return 1;
  };
  
  const [currentStep, setCurrentStep] = useState(getPersistedStep);
  const [wizardData, setWizardData] = useState<WizardData>(getPersistedData);
  
  // Load persisted data when wizard opens
  useEffect(() => {
    if (isOpen) {
      const persistedData = getPersistedData();
      const persistedStep = getPersistedStep();
      setWizardData(persistedData);
      setCurrentStep(persistedStep);
    }
  }, [isOpen]);
  
  // Persist wizard data whenever it changes
  useEffect(() => {
    if (isOpen && wizardData) {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(wizardData));
      } catch (error) {
        console.error('Failed to persist wizard data:', error);
      }
    }
  }, [wizardData, isOpen]);
  
  // Persist current step whenever it changes
  useEffect(() => {
    if (isOpen) {
      try {
        sessionStorage.setItem(STEP_STORAGE_KEY, currentStep.toString());
      } catch (error) {
        console.error('Failed to persist step:', error);
      }
    }
  }, [currentStep, isOpen]);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clear persisted wizard data
  const clearPersistedData = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STEP_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear persisted wizard data:', error);
    }
  };

  // Create tenant mutation
  const createTenantMutation = useMutation({
    mutationFn: async (finalData: WizardData) => {
      const response = await apiRequest('POST', '/api/admin/tenants/wizard', finalData);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
      
      // Show success message with webhook URL if calendar is configured
      const calendarType = wizardData.calendarConfig?.type;
      const webhookUrl = calendarType && data.tenant?.id 
        ? `${window.location.origin}/api/webhooks/${calendarType === 'calcom' ? 'cal-com' : 'calendly'}/${data.tenant.id}`
        : null;
      
      toast({
        title: "Tenant created successfully!",
        description: webhookUrl 
          ? `${wizardData.businessName} has been activated. Webhook URL: ${webhookUrl}`
          : `${wizardData.businessName} has been activated and admin credentials have been sent.`,
        duration: 10000, // Show for longer to allow copying webhook URL
      });
      
      // Clear persisted data after successful creation
      clearPersistedData();
      onComplete();
      onClose();
    },
    onError: (error: Error) => {
      console.error('Tenant creation error:', error);
      toast({
        title: "Failed to create tenant",
        description: error.message || "Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  const updateWizardData = (stepData: Partial<WizardData>) => {
    setWizardData(prev => ({ ...prev, ...stepData }));
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= currentStep) {
      setCurrentStep(step);
    }
  };

  const handleComplete = () => {
    createTenantMutation.mutate(wizardData);
  };

  const handleStartFresh = () => {
    if (confirm('Are you sure you want to start fresh? All entered data will be lost.')) {
      clearPersistedData();
      setWizardData(getInitialWizardData());
      setCurrentStep(1);
      toast({
        title: "Wizard reset",
        description: "All data cleared. Starting fresh from step 1.",
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <BusinessDiscoveryStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            data-testid="step-business-discovery"
          />
        );
      case 2:
        return (
          <TemplateSelectionStep
            data={wizardData}
            updateData={updateWizardData}
            onNext={nextStep}
            onBack={prevStep}
            data-testid="step-template-selection"
          />
        );
      case 3:
        return (
          <FeatureControlStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onPrevious={prevStep}
            data-testid="step-feature-control"
          />
        );
      case 4:
        return (
          <AdminSetupStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onPrevious={prevStep}
            data-testid="step-admin-setup"
          />
        );
      case 5:
        return (
          <IntegrationConfigStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onPrevious={prevStep}
            data-testid="step-integration-config"
          />
        );
      case 6:
        return (
          <BusinessConfigStep
            data={wizardData}
            onUpdate={updateWizardData}
            onNext={nextStep}
            onPrevious={prevStep}
            data-testid="step-business-config"
          />
        );
      case 7:
        return (
          <ReviewActivateStep
            data={wizardData}
            updateData={updateWizardData}
            onNext={nextStep}
            onBack={prevStep}
            onComplete={handleComplete}
            isCreating={createTenantMutation.isPending}
            data-testid="step-review-activate"
          />
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" data-testid="tenant-wizard-modal">
      <div className="bg-background w-full max-w-4xl h-[90vh] rounded-lg shadow-xl flex flex-col">
        {/* Header */}
        <div className="border-b border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground" data-testid="wizard-title">
                Create New Tenant
              </h2>
              <p className="text-muted-foreground mt-1">
                Step {currentStep} of {WIZARD_STEPS.length}: {WIZARD_STEPS[currentStep - 1]?.title}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleStartFresh} 
                data-testid="button-start-fresh"
              >
                Start Fresh
              </Button>
              <Button variant="ghost" onClick={onClose} data-testid="button-close-wizard">
                ✕
              </Button>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <Progress 
              value={(currentStep / WIZARD_STEPS.length) * 100} 
              className="h-2"
              data-testid="wizard-progress"
            />
          </div>
          
          {/* Step Indicators */}
          <div className="flex items-center justify-between mt-4">
            {WIZARD_STEPS.map((step) => (
              <div 
                key={step.id} 
                className={`flex flex-col items-center text-center flex-1 cursor-pointer transition-opacity ${
                  step.id <= currentStep ? 'opacity-100 hover:opacity-80' : 'opacity-50'
                }`}
                onClick={() => goToStep(step.id)}
                data-testid={`step-indicator-${step.id}`}
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 mb-2">
                  {step.id < currentStep ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : step.id === currentStep ? (
                    <Circle className="w-5 h-5 text-primary fill-primary" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="text-xs">
                  <div className={`font-medium ${step.id <= currentStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {step.title}
                  </div>
                  <div className="text-muted-foreground text-xs mt-1">
                    {step.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-auto p-6">
          {renderStepContent()}
        </div>
      </div>
    </div>
  );
}