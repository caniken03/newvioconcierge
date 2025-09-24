import React from "react";
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
import { Separator } from "@/components/ui/separator";
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

export default function ContactModal({ isOpen, onClose, contact }: ContactModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEditing = !!contact;

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

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && !contact) {
      // Ensure clean form state for new contacts
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
  }, [isOpen, contact, form]);

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
        description: "Contact has been successfully updated.",
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update contact information and appointment details.' : 'Add a new contact with appointment details.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="space-y-6">
              {/* Basic Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
                
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

              <Separator />

              {/* Appointment Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Appointment Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            value={field.value || ""} 
                            placeholder="Consultation, Checkup, Treatment..."
                            data-testid="input-appointment-type"
                            autoComplete="off"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

              <Separator />

              {/* Business & Communication Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Business & Communication</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Owner</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value || ""}
                            placeholder="Business owner or contact person"
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
                        <FormLabel>Company Name</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value || ""}
                            placeholder="Company or organization name"
                            data-testid="input-company-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            <SelectItem value="Europe/London">London (GMT)</SelectItem>
                            <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                            <SelectItem value="America/New_York">New York (EST)</SelectItem>
                            <SelectItem value="America/Los_Angeles">Los Angeles (PST)</SelectItem>
                            <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                            <SelectItem value="Australia/Sydney">Sydney (AEST)</SelectItem>
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
                        <FormLabel>Call Before Hours</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            min="1"
                            max="168"
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Additional Information</h3>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any additional notes about this contact..."
                          rows={3}
                          data-testid="textarea-contact-notes"
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
                          value={field.value || ""}
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
            </div>

            <DialogFooter className="flex justify-between">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-close-modal"
              >
                Cancel
              </Button>
              
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
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}