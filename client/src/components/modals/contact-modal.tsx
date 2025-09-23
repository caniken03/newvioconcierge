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
import type { Contact } from "@/types";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal('')),
  appointmentTime: z.string().optional(),
  appointmentType: z.string().optional(),
  appointmentDuration: z.number().min(15).max(480).default(60),
  appointmentStatus: z.enum(['pending', 'confirmed', 'cancelled', 'completed']).default('pending'),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
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
      name: contact?.name || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      appointmentTime: contact?.appointmentTime ? 
        new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
      appointmentType: contact?.appointmentType || "",
      appointmentDuration: contact?.appointmentDuration || 60,
      appointmentStatus: contact?.appointmentStatus || 'pending',
      notes: contact?.notes || "",
      specialInstructions: contact?.specialInstructions || "",
    },
  });

  // Reset form when contact changes
  React.useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        phone: contact.phone,
        email: contact.email || "",
        appointmentTime: contact.appointmentTime ? 
          new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
        appointmentType: contact.appointmentType || "",
        appointmentDuration: contact.appointmentDuration || 60,
        appointmentStatus: contact.appointmentStatus,
        notes: contact.notes || "",
        specialInstructions: contact.specialInstructions || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        email: "",
        appointmentTime: "",
        appointmentType: "",
        appointmentDuration: 60,
        appointmentStatus: 'pending',
        notes: "",
        specialInstructions: "",
      });
    }
  }, [contact, form]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const payload = {
        ...data,
        appointmentTime: data.appointmentTime ? new Date(data.appointmentTime).toISOString() : undefined,
        email: data.email || undefined,
        appointmentType: data.appointmentType || undefined,
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add New Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update the contact information and appointment details.'
              : 'Add a new contact with appointment information.'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Contact Information</h4>
                
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

              {/* Appointment Information */}
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">Appointment Details</h4>
                
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
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-foreground">Additional Information</h4>
              
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
                        placeholder="Any special instructions for the appointment reminder call..."
                        rows={2}
                        data-testid="textarea-special-instructions"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
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
