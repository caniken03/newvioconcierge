import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { Contact } from "@/types";

const contactSchema = z.object({
  // Basic Contact Information
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
  
  // Appointment Details
  appointmentTime: z.string().optional(),
  appointmentType: z.string().optional(),
  appointmentDuration: z.number().min(15).max(480).default(60),
  appointmentStatus: z.enum(['pending', 'confirmed', 'cancelled', 'rescheduled']).default('pending'),
  
  // Enhanced PRD Fields
  timezone: z.string().default("Europe/London"),
  callBeforeHours: z.number().min(1).max(168).default(24), // 1 hour to 1 week
  ownerName: z.string().optional(),
  companyName: z.string().optional(),
  bookingSource: z.enum(['manual', 'calcom', 'calendly']).default('manual'),
  priorityLevel: z.enum(['normal', 'high', 'urgent']).default('normal'),
  preferredContactMethod: z.enum(['voice', 'email', 'sms']).default('voice'),
  
  // Additional Information
  notes: z.string().optional(),
  specialInstructions: z.string().max(300, "Special instructions must be under 300 characters").optional(),
});

type ContactForm = z.infer<typeof contactSchema>;

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact?: Contact | null;
}

const STEPS = [
  { id: 1, name: 'Basic Information', description: 'Contact details' },
  { id: 2, name: 'Appointment Details', description: 'Meeting information' },
  { id: 3, name: 'Business & Communication', description: 'Enhanced details' },
  { id: 4, name: 'Additional Information', description: 'Notes and instructions' },
];

export default function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contact;
  const [currentStep, setCurrentStep] = useState(1);

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      // Basic Contact Information
      name: contact?.name || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      
      // Appointment Details
      appointmentTime: contact?.appointmentTime ? 
        new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
      appointmentType: contact?.appointmentType || "",
      appointmentDuration: contact?.appointmentDuration || 60,
      appointmentStatus: contact?.appointmentStatus || 'pending',
      
      // Enhanced PRD Fields
      timezone: contact?.timezone || "Europe/London",
      callBeforeHours: contact?.callBeforeHours || 24,
      ownerName: contact?.ownerName || "",
      companyName: contact?.companyName || "",
      bookingSource: contact?.bookingSource || 'manual',
      priorityLevel: contact?.priorityLevel || 'normal',
      preferredContactMethod: contact?.preferredContactMethod || 'voice',
      
      // Additional Information
      notes: contact?.notes || "",
      specialInstructions: contact?.specialInstructions || "",
    },
  });

  // Reset form when contact changes
  React.useEffect(() => {
    if (contact) {
      form.reset({
        // Basic Contact Information
        name: contact.name,
        phone: contact.phone,
        email: contact.email || "",
        
        // Appointment Details
        appointmentTime: contact.appointmentTime ? 
          new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
        appointmentType: contact.appointmentType || "",
        appointmentDuration: contact.appointmentDuration || 60,
        appointmentStatus: contact.appointmentStatus,
        
        // Enhanced PRD Fields
        timezone: contact.timezone || "Europe/London",
        callBeforeHours: contact.callBeforeHours || 24,
        ownerName: contact.ownerName || "",
        companyName: contact.companyName || "",
        bookingSource: contact.bookingSource || 'manual',
        priorityLevel: contact.priorityLevel || 'normal',
        preferredContactMethod: contact.preferredContactMethod || 'voice',
        
        // Additional Information
        notes: contact.notes || "",
        specialInstructions: contact.specialInstructions || "",
      });
    } else {
      form.reset({
        // Basic Contact Information
        name: "",
        phone: "",
        email: "",
        
        // Appointment Details
        appointmentTime: "",
        appointmentType: "",
        appointmentDuration: 60,
        appointmentStatus: 'pending',
        
        // Enhanced PRD Fields
        timezone: "Europe/London",
        callBeforeHours: 24,
        ownerName: "",
        companyName: "",
        bookingSource: 'manual',
        priorityLevel: 'normal',
        preferredContactMethod: 'voice',
        
        // Additional Information
        notes: "",
        specialInstructions: "",
      });
    }
  }, [contact, form]);

  // Step validation functions
  const validateStep = async (step: number): Promise<boolean> => {
    const fields = getStepFields(step);
    const result = await form.trigger(fields);
    return result;
  };

  const getStepFields = (step: number): (keyof ContactForm)[] => {
    switch (step) {
      case 1:
        return ['name', 'phone', 'email'];
      case 2:
        return ['appointmentTime', 'appointmentType', 'appointmentDuration', 'appointmentStatus'];
      case 3:
        return ['timezone', 'callBeforeHours', 'ownerName', 'companyName', 'bookingSource', 'priorityLevel', 'preferredContactMethod'];
      case 4:
        return ['notes', 'specialInstructions'];
      default:
        return [];
    }
  };

  // Navigation functions
  const nextStep = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Reset step when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const payload = {
        ...data,
        appointmentTime: data.appointmentTime ? new Date(data.appointmentTime).toISOString() : undefined,
        email: data.email || undefined,
        appointmentType: data.appointmentType || undefined,
        ownerName: data.ownerName || undefined,
        companyName: data.companyName || undefined,
        notes: data.notes || undefined,
        specialInstructions: data.specialInstructions || undefined,
      };
      
      const response = await apiRequest('POST', '/api/contacts', payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      onClose();
      toast({
        title: "Contact created",
        description: "New contact has been successfully added.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update contact mutation
  const updateContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      if (!contact) throw new Error("No contact to update");
      
      const payload = {
        ...data,
        appointmentTime: data.appointmentTime ? new Date(data.appointmentTime).toISOString() : undefined,
        email: data.email || undefined,
        appointmentType: data.appointmentType || undefined,
        ownerName: data.ownerName || undefined,
        companyName: data.companyName || undefined,
        notes: data.notes || undefined,
        specialInstructions: data.specialInstructions || undefined,
      };
      
      const response = await apiRequest('PATCH', `/api/contacts/${contact.id}`, payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      onClose();
      toast({
        title: "Contact updated",
        description: "Contact information has been successfully updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update contact",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (data: ContactForm) => {
    if (isEditing) {
      updateContactMutation.mutate(data);
    } else {
      createContactMutation.mutate(data);
    }
  };

  const isLoading = createContactMutation.isPending || updateContactMutation.isPending;

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="John Smith"
                      data-testid="input-contact-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="+44 7700 900123"
                      data-testid="input-contact-phone"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email"
                      placeholder="john.smith@example.com"
                      data-testid="input-contact-email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Date & Time</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="datetime-local"
                      data-testid="input-appointment-time"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Consultation, Checkup, Treatment..."
                      data-testid="input-appointment-type"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentDuration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        min="15"
                        max="480"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 60)}
                        data-testid="input-appointment-duration"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="appointmentStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-appointment-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 3:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Details */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Business Details</h4>
              
              <FormField
                control={form.control}
                name="ownerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meeting With</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Dr. Smith, John Johnson, etc."
                        data-testid="input-owner-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company/Organization</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="For multi-client agencies"
                        data-testid="input-company-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bookingSource"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking Source</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-booking-source">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="manual">Manual Entry</SelectItem>
                        <SelectItem value="calcom">Cal.com</SelectItem>
                        <SelectItem value="calendly">Calendly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priorityLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-priority-level">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Communication Preferences */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Communication Preferences</h4>
              
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-timezone">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                        <SelectItem value="America/Chicago">America/Chicago (CST)</SelectItem>
                        <SelectItem value="America/Denver">America/Denver (MST)</SelectItem>
                        <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                        <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="callBeforeHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Before (Hours)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        min="1"
                        max="168"
                        placeholder="24"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                        data-testid="input-call-before-hours"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preferredContactMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Contact Method</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-contact-method">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="voice">Voice Call</SelectItem>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any additional notes about this contact..."
                      rows={3}
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialInstructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Special Instructions</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Any special instructions for the appointment reminder call (max 300 characters)..."
                      rows={2}
                      data-testid="textarea-special-instructions"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            Step {currentStep} of {STEPS.length}: {STEPS.find(s => s.id === currentStep)?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`flex items-center ${
                  step.id <= currentStep ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 mr-2 ${
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground border-primary'
                      : step.id === currentStep
                      ? 'border-primary'
                      : 'border-muted-foreground'
                  }`}
                >
                  {step.id < currentStep ? (
                    <Check size={16} />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="hidden sm:inline">{step.name}</span>
              </div>
            ))}
          </div>
          <Progress 
            value={(currentStep / STEPS.length) * 100} 
            className="w-full"
            data-testid="progress-indicator"
          />
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Step Content */}
            <div className="min-h-[400px]">
              {renderStepContent()}
            </div>

            {/* Navigation Footer */}
            <DialogFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-close-modal"
              >
                Cancel
              </Button>
              
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={prevStep}
                    data-testid="button-previous-step"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Previous
                  </Button>
                )}
                
                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    data-testid="button-next-step"
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    data-testid="button-save-contact"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      isEditing ? 'Update Contact' : 'Create Contact'
                    )}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}