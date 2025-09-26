import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { Contact } from "@/types";

const contactSchema = z.object({
  // Basic Contact Information
  name: z.string().min(1, "Client Name is required"),
  phone: z.string().min(1, "Phone Number is required"),
  
  // Group Assignment
  groupId: z.string().optional(),
  
  // Call Personalization Fields
  eventType: z.string().optional(),
  contactPerson: z.string().optional(),
  businessName: z.string().min(1, "Business Name is required for caller identification"),
  appointmentDuration: z.number().min(1).max(999).optional(),
  specialInstructions: z.string().max(300, "Special instructions must be under 300 characters").optional(),
  
  // Appointment Details
  appointmentTime: z.string().min(1, "Appointment Date & Time is required"),
  callBeforeHours: z.coerce.number().min(1).max(168).default(24),
  
  // Additional Information
  notes: z.string().optional(),
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

  // Fetch contact groups for dropdown
  const { data: contactGroups = [] } = useQuery({
    queryKey: ['/api/contact-groups'],
    enabled: isOpen,
  }) as { data: any[] };

  // For editing contacts, fetch current group membership by checking all groups
  const { data: currentMembership } = useQuery({
    queryKey: ['/api/contact-groups', contact?.id, 'membership'],
    enabled: isOpen && !!contact && contactGroups.length > 0,
    queryFn: async () => {
      if (!contact || !contactGroups.length) return null;
      
      // Check each group to see if the contact is a member
      for (const group of contactGroups) {
        try {
          const response = await apiRequest('GET', `/api/contact-groups/${group.id}/contacts`);
          const groupContacts = await response.json();
          const isMember = groupContacts.some((c: any) => c.id === contact.id);
          if (isMember) {
            return group.id;
          }
        } catch (error) {
          // Continue checking other groups if one fails
          continue;
        }
      }
      return null;
    }
  });

  const form = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: contact?.name || "",
      phone: contact?.phone || "",
      email: contact?.email || "",
      groupId: "none",
      eventType: contact?.appointmentType || "",
      contactPerson: contact?.ownerName || "",
      businessName: contact?.companyName || "",
      appointmentDuration: contact?.appointmentDuration || undefined,
      specialInstructions: contact?.specialInstructions || "",
      appointmentTime: contact?.appointmentTime ? 
        new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
      callBeforeHours: contact?.callBeforeHours || 24,
      notes: contact?.notes || "",
    },
  });
  
  // State for automatic call time calculation
  const [calculatedCallTime, setCalculatedCallTime] = useState<string>("");
  
  // Watch appointment time and call before hours for automatic calculation
  const appointmentTime = form.watch("appointmentTime");
  const callBeforeHours = form.watch("callBeforeHours");
  
  // Calculate call time whenever appointment time or hours before changes
  useEffect(() => {
    if (appointmentTime && callBeforeHours) {
      const appointmentDate = new Date(appointmentTime);
      const callDate = new Date(appointmentDate.getTime() - (callBeforeHours * 60 * 60 * 1000));
      
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      setCalculatedCallTime(callDate.toLocaleString('en-GB', options));
    } else {
      setCalculatedCallTime("");
    }
  }, [appointmentTime, callBeforeHours]);

  // Reset form when contact changes
  React.useEffect(() => {
    if (contact) {
      form.reset({
        name: contact.name,
        phone: contact.phone,
        groupId: currentMembership || "none",
        eventType: contact.appointmentType || "",
        contactPerson: contact.ownerName || "",
        businessName: contact.companyName || "",
        appointmentDuration: contact.appointmentDuration || undefined,
        specialInstructions: contact.specialInstructions || "",
        appointmentTime: contact.appointmentTime ? 
          new Date(contact.appointmentTime).toISOString().slice(0, 16) : "",
        callBeforeHours: contact.callBeforeHours || 24,
        notes: contact.notes || "",
      });
    } else {
      form.reset({
        name: "",
        phone: "",
        groupId: "none",
        eventType: "",
        contactPerson: "",
        businessName: "",
        appointmentDuration: undefined,
        specialInstructions: "",
        appointmentTime: "",
        callBeforeHours: 24,
        notes: "",
      });
    }
  }, [contact, form, currentMembership]);

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen && !contact) {
      form.reset({
        name: "",
        phone: "",
        groupId: "none",
        eventType: "",
        contactPerson: "",
        businessName: "",
        appointmentDuration: undefined,
        specialInstructions: "",
        appointmentTime: "",
        callBeforeHours: 24,
        notes: "",
      });
    }
  }, [isOpen, contact, form]);

  // Create contact mutation
  const createContactMutation = useMutation({
    mutationFn: async (data: ContactForm) => {
      const payload = {
        name: data.name,
        phone: data.phone,
        appointmentTime: new Date(data.appointmentTime).toISOString(),
        appointmentType: data.eventType || undefined,
        appointmentDuration: data.appointmentDuration || undefined,
        appointmentStatus: 'pending',
        callBeforeHours: data.callBeforeHours,
        ownerName: data.contactPerson || undefined,
        companyName: data.businessName || undefined,
        notes: data.notes || undefined,
        specialInstructions: data.specialInstructions || undefined,
      };
      
      const response = await apiRequest('POST', '/api/contacts', payload);
      const newContact = await response.json();
      
      // If a group was selected, add the contact to that group
      if (data.groupId && data.groupId !== "none") {
        await apiRequest('POST', `/api/contact-groups/${data.groupId}/contacts`, {
          contactId: newContact.id
        });
      }
      
      return newContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'] });
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
        name: data.name,
        phone: data.phone,
        appointmentTime: new Date(data.appointmentTime).toISOString(),
        appointmentType: data.eventType || undefined,
        appointmentDuration: data.appointmentDuration || undefined,
        callBeforeHours: data.callBeforeHours,
        ownerName: data.contactPerson || undefined,
        companyName: data.businessName || undefined,
        notes: data.notes || undefined,
        specialInstructions: data.specialInstructions || undefined,
      };
      
      const response = await apiRequest('PATCH', `/api/contacts/${contact.id}`, payload);
      const updatedContact = await response.json();
      
      // Handle group assignment changes
      const newGroupId = data.groupId === "none" ? null : data.groupId;
      if (currentMembership !== newGroupId) {
        // Remove from current group if they were in one
        if (currentMembership) {
          await apiRequest('DELETE', `/api/contact-groups/${currentMembership}/contacts/${contact.id}`);
        }
        
        // Add to new group if one was selected
        if (newGroupId) {
          await apiRequest('POST', `/api/contact-groups/${newGroupId}/contacts`, {
            contactId: contact.id
          });
        }
      }
      
      return updatedContact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contacts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contacts/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/contact-groups'] });
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
          <DialogTitle className="flex items-center text-blue-600">
            <i className="fas fa-plus text-sm mr-2"></i>
            {isEditing ? 'Edit Contact' : 'Add New Client'}
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {isEditing ? 'Update client information and appointment details.' : 'Create a new client and schedule their appointment call'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Client Name and Phone Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Client Name *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ken Barnes"
                        className="border-gray-300 rounded-md"
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
                    <FormLabel className="text-sm font-medium text-gray-700">Phone Number *</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="+447375100366"
                        className="border-gray-300 rounded-md"
                        data-testid="input-contact-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            

            {/* Group Assignment */}
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Contact Group (Optional)</FormLabel>
                  <FormControl>
                    <Select value={field.value || "none"} onValueChange={field.onChange}>
                      <SelectTrigger data-testid="select-contact-group" className="border-gray-300 rounded-md">
                        <SelectValue placeholder="Select a group (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Group</SelectItem>
                        {contactGroups.map((group: any) => (
                          <SelectItem key={group.id} value={group.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: group.color }}
                              ></div>
                              {group.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Call Personalization Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center mb-3">
                <i className="fas fa-phone text-blue-600 mr-2"></i>
                <h3 className="text-sm font-medium text-blue-700">Call Personalization</h3>
              </div>
              <p className="text-xs text-blue-600 mb-4">
                These details personalize VioConcierge's conversation (leave blank for generic/HIPAA compliance)
              </p>
              
              <div className="space-y-4">
                {/* Event Type and Contact Person */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Event Type (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value || ""}
                            placeholder="meeting, consultation, service"
                            className="border-gray-300 rounded-md bg-white"
                            data-testid="input-event-type"
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">Leave blank for medical/HIPAA compliance</p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPerson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700">Contact Person (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field}
                            value={field.value || ""}
                            placeholder="Contact Person, Manager, Representative"
                            className="border-gray-300 rounded-md bg-white"
                            data-testid="input-contact-person"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Business Name */}
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Business Name *</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          value={field.value || ""}
                          placeholder="Business Name, Company Name"
                          className="border-gray-300 rounded-md bg-white"
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <p className="text-xs text-gray-500">For multi-client agencies - specify which company</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Appointment Duration */}
                <FormField
                  control={form.control}
                  name="appointmentDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Appointment Duration (Optional)</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input 
                            {...field}
                            type="number"
                            min="1"
                            max="999"
                            placeholder="30"
                            className="border-gray-300 rounded-md bg-white w-20"
                            onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                            data-testid="input-appointment-duration"
                          />
                        </FormControl>
                        <span className="text-sm text-gray-500">minutes</span>
                      </div>
                      <p className="text-xs text-gray-500">Voice agent will mention expected duration for planning</p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Special Instructions */}
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700">Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          value={field.value || ""}
                          placeholder="Please arrive 10 minutes early, bring photo ID and insurance card, use the rear entrance on Mill Street..."
                          className="border-gray-300 rounded-md bg-white min-h-[80px] resize-none"
                          maxLength={300}
                          data-testid="input-special-instructions"
                        />
                      </FormControl>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-gray-500">Multiple instructions welcome - VioConcierge delivers them naturally with proper pacing</p>
                        <span className="text-xs text-gray-400">{(field.value || "").length}/300</span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Appointment Date & Time and VioConcierge Calls Before */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="appointmentTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">Appointment Date & Time *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        value={field.value || ""}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                        }}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="border-gray-300 rounded-md"
                        data-testid="input-appointment-time"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">When the customer should arrive for their appointment</p>
                    {calculatedCallTime && (
                      <p className="text-sm font-medium text-blue-600 mt-1">
                        VioConcierge will call: {calculatedCallTime}
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="callBeforeHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-gray-700">VioConcierge Calls Before (Hours)</FormLabel>
                    <FormControl>
                      <Input 
                        {...field}
                        type="number"
                        min="1"
                        max="168"
                        placeholder="24"
                        className="border-gray-300 rounded-md"
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                        data-testid="input-call-before-hours"
                      />
                    </FormControl>
                    <p className="text-xs text-gray-500">
                      How many hours before the appointment VioConcierge should call<br />
                      1 hour minimum, 168 hours (7 days) maximum
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes Section */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ""}
                      placeholder="Additional notes about this contact..."
                      className="border-gray-300 rounded-md min-h-[80px] resize-none"
                      data-testid="textarea-contact-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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