import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Stethoscope, Scissors, UtensilsCrossed, Briefcase, Building2, Settings } from "lucide-react";

const BUSINESS_TEMPLATES = [
  {
    id: 'medical',
    title: '🏥 Medical Practice',
    subtitle: 'Healthcare & Medical Services',
    description: 'Doctors, dentists, clinics, healthcare providers',
    icon: Stethoscope,
    features: ['HIPAA Compliance', 'Patient Privacy Protection', 'Medical Terminology', 'Health Records Integration'],
    compliance: 'Automatically enables HIPAA compliance features',
    color: 'bg-red-100 text-red-800 border-red-200',
  },
  {
    id: 'salon',
    title: '💅 Salon & Beauty',
    subtitle: 'Beauty & Wellness Services',
    description: 'Hair salons, spas, beauty treatments, wellness centers',
    icon: Scissors,
    features: ['Service Duration Tracking', 'Stylist Assignment', 'Beauty-specific Scripts', 'Treatment Reminders'],
    optimization: 'Optimized for personal service experience',
    color: 'bg-pink-100 text-pink-800 border-pink-200',
  },
  {
    id: 'restaurant',
    title: '🍽️ Restaurant & Dining',
    subtitle: 'Food & Hospitality Services',
    description: 'Restaurants, cafes, fine dining, casual dining',
    icon: UtensilsCrossed,
    features: ['Party Size Management', 'Dietary Tracking', 'Occasion Recognition', 'Reservation Management'],
    optimization: 'Optimized for guest experience and hospitality',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  {
    id: 'consultant',
    title: '💼 Professional Services',
    subtitle: 'Consulting & Business Services',
    description: 'Business consultants, professional services, advisory',
    icon: Briefcase,
    features: ['Meeting Preparation', 'Business Context', 'Professional Terminology', 'Client Management'],
    optimization: 'Optimized for professional business meetings',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'general',
    title: '🏢 General Business',
    subtitle: 'Universal Appointment Business',
    description: 'Any appointment-based business not listed above',
    icon: Building2,
    features: ['Flexible Configuration', 'Universal Compatibility', 'Custom Field Options', 'Adaptable Scripts'],
    optimization: 'Fully customizable for any business type',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
  },
  {
    id: 'custom',
    title: '⚙️ Custom Template',
    subtitle: 'Tailored Configuration',
    description: 'Create a custom template for specialized business needs',
    icon: Settings,
    features: ['Complete Customization', 'Specialized Scripts', 'Custom Workflows', 'Bespoke Features'],
    optimization: 'Built specifically for unique business requirements',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
];

interface TemplateSelectionStepProps {
  data: any;
  onUpdate: (data: any) => void;
  onNext: () => void;
  onPrevious: () => void;
}

export default function TemplateSelectionStep({ data, onUpdate, onNext, onPrevious }: TemplateSelectionStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState(data.businessTemplate || '');

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    onUpdate({ businessTemplate: templateId });
  };

  const handleNext = () => {
    if (selectedTemplate) {
      onNext();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Settings className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Select Business Template</h3>
        <p className="text-muted-foreground">
          Choose the template that best matches the business type. This will configure optimal settings and features.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BUSINESS_TEMPLATES.map((template) => {
          const IconComponent = template.icon;
          const isSelected = selectedTemplate === template.id;
          
          return (
            <Card 
              key={template.id}
              className={`cursor-pointer transition-all border-2 ${
                isSelected 
                  ? 'border-primary ring-2 ring-primary/20 bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
              data-testid={`template-${template.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <IconComponent className="w-6 h-6 text-primary" />
                    <div>
                      <CardTitle className="text-lg">{template.title}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.subtitle}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 bg-white rounded-full" />
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {template.description}
                </p>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Key Features:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.features.slice(0, 2).map((feature) => (
                        <Badge key={feature} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {template.features.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.features.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {template.compliance && (
                    <div className={`text-xs p-2 rounded border ${template.color}`}>
                      <strong>Compliance:</strong> {template.compliance}
                    </div>
                  )}
                  
                  {template.optimization && (
                    <div className="text-xs text-muted-foreground">
                      <strong>Optimization:</strong> {template.optimization}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedTemplate && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              <strong>Selected:</strong> {BUSINESS_TEMPLATES.find(t => t.id === selectedTemplate)?.title}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This template will configure the optimal settings, compliance features, and voice scripts for this business type.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onPrevious} data-testid="button-previous-template">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button 
          onClick={handleNext} 
          disabled={!selectedTemplate}
          data-testid="button-next-template"
        >
          Continue
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}