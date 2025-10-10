import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TenantConfig } from "@shared/schema";
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
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const configSchema = z.object({
  // Voice AI Settings
  retellAgentId: z.string().optional(),
  retellAgentNumber: z.string().optional(),
  retellApiKey: z.string().optional(),
  
  // Calendar Integration
  calendarType: z.enum(['manual', 'cal', 'calendly']).default('manual'),
  calApiKey: z.string().optional(),
  calEventTypeId: z.number().optional(),
  calendlyApiKey: z.string().optional(),
  calendlyOrganizerEmail: z.string().email().optional().or(z.literal('')),
  
  // Business Settings
  businessType: z.string().default('professional'),
  timezone: z.string().default('Europe/London'),
  followUpHours: z.number().min(1).max(168).default(24),
  
  // Rate Limiting
  maxCallsPerDay: z.number().min(1).max(1000).default(300),
  maxCallsPer15Min: z.number().min(1).max(100).default(25),
  quietStart: z.string().default('20:00'),
  quietEnd: z.string().default('08:00'),
  
  // Travel & Parking Directions
  publicTransportInstructions: z.string().optional(),
  parkingInstructions: z.string().optional(),
  arrivalNotes: z.string().optional(),
});

type ConfigForm = z.infer<typeof configSchema>;

interface TenantConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TenantConfigModal({ isOpen, onClose }: TenantConfigModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ConfigForm>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      calendarType: 'manual',
      businessType: 'professional',
      timezone: 'Europe/London',
      followUpHours: 24,
      maxCallsPerDay: 300,
      maxCallsPer15Min: 25,
      quietStart: '20:00',
      quietEnd: '08:00',
      publicTransportInstructions: '',
      parkingInstructions: '',
      arrivalNotes: '',
    },
  });

  // Fetch existing configuration
  const { data: config } = useQuery<TenantConfig>({
    queryKey: ['/api/tenant/config'],
    enabled: isOpen,
  });

  // Update form when config is loaded
  React.useEffect(() => {
    if (config) {
      form.reset({
        ...config,
        calendarType: config.calApiKey ? 'cal' : config.calendlyApiKey ? 'calendly' : 'manual',
      });
    }
  }, [config, form]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (data: ConfigForm) => {
      const { calendarType, ...configData } = data;
      
      // Clear calendar fields based on selection
      if (calendarType === 'manual') {
        configData.calApiKey = '';
        configData.calEventTypeId = undefined;
        configData.calendlyApiKey = '';
        configData.calendlyOrganizerEmail = '';
      } else if (calendarType === 'cal') {
        configData.calendlyApiKey = '';
        configData.calendlyOrganizerEmail = '';
      } else if (calendarType === 'calendly') {
        configData.calApiKey = '';
        configData.calEventTypeId = undefined;
      }

      const response = await apiRequest('POST', '/api/tenant/config', configData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant/config'] });
      onClose();
      toast({
        title: "Configuration saved",
        description: "Your tenant configuration has been updated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSave = (data: ConfigForm) => {
    saveConfigMutation.mutate(data);
  };

  const calendarType = form.watch('calendarType');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tenant Configuration</DialogTitle>
          <DialogDescription>
            Configure your business settings, integrations, and call management preferences.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Voice AI Configuration */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-4">Voice AI Settings</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="retellAgentId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Retell Agent ID</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="agent_xxxxxxxxx"
                              data-testid="input-retell-agent-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="retellAgentNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              placeholder="+44 xxxx xxxxxx"
                              data-testid="input-phone-number"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="retellApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>API Key</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="password"
                              placeholder="Your Retell AI API key"
                              data-testid="input-retell-api-key"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Calendar Integration */}
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-4">Calendar Integration</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="calendarType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Integration Type</FormLabel>
                          <FormControl>
                            <RadioGroup 
                              value={field.value} 
                              onValueChange={field.onChange}
                              className="space-y-2"
                            >
                              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer">
                                <RadioGroupItem value="cal" id="cal" />
                                <Label htmlFor="cal" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-sm">Cal.com</span>
                                  <p className="text-xs text-muted-foreground">Connect with Cal.com calendar</p>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer">
                                <RadioGroupItem value="calendly" id="calendly" />
                                <Label htmlFor="calendly" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-sm">Calendly</span>
                                  <p className="text-xs text-muted-foreground">Connect with Calendly calendar</p>
                                </Label>
                              </div>
                              <div className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer">
                                <RadioGroupItem value="manual" id="manual" />
                                <Label htmlFor="manual" className="flex-1 cursor-pointer">
                                  <span className="font-medium text-sm">Manual Entry</span>
                                  <p className="text-xs text-muted-foreground">Manually manage appointments</p>
                                </Label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Cal.com specific fields */}
                    {calendarType === 'cal' && (
                      <>
                        <FormField
                          control={form.control}
                          name="calApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Cal.com API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="password"
                                  placeholder="Your Cal.com API key"
                                  data-testid="input-cal-api-key"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="calEventTypeId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Event Type ID</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="number"
                                  placeholder="123456"
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                                  data-testid="input-cal-event-type-id"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Calendly specific fields */}
                    {calendarType === 'calendly' && (
                      <>
                        <FormField
                          control={form.control}
                          name="calendlyApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Calendly API Key</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="password"
                                  placeholder="Your Calendly API key"
                                  data-testid="input-calendly-api-key"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="calendlyOrganizerEmail"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Organizer Email</FormLabel>
                              <FormControl>
                                <Input 
                                  {...field}
                                  type="email"
                                  placeholder="organizer@example.com"
                                  data-testid="input-calendly-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Business Settings */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-4">Business Settings</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type</FormLabel>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <FormControl>
                              <SelectTrigger data-testid="select-business-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="healthcare">Healthcare</SelectItem>
                              <SelectItem value="beauty">Beauty & Wellness</SelectItem>
                              <SelectItem value="professional">Professional Services</SelectItem>
                              <SelectItem value="education">Education</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

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
                              <SelectItem value="Europe/London">Europe/London</SelectItem>
                              <SelectItem value="Europe/Paris">Europe/Paris</SelectItem>
                              <SelectItem value="America/New_York">America/New_York</SelectItem>
                              <SelectItem value="America/Los_Angeles">America/Los_Angeles</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="followUpHours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Follow-up Hours</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              min="1"
                              max="168"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 24)}
                              data-testid="input-followup-hours"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Hours before appointment to make reminder call</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Rate Limiting */}
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-4">Rate Limiting & Protection</h4>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="maxCallsPerDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Calls per Day</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              min="1"
                              max="1000"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 300)}
                              data-testid="input-max-calls-day"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxCallsPer15Min"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Calls per 15 Minutes</FormLabel>
                          <FormControl>
                            <Input 
                              {...field}
                              type="number"
                              min="1"
                              max="100"
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 25)}
                              data-testid="input-max-calls-15min"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quietStart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quiet Hours Start</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="time"
                                data-testid="input-quiet-start"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="quietEnd"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quiet Hours End</FormLabel>
                            <FormControl>
                              <Input 
                                {...field}
                                type="time"
                                data-testid="input-quiet-end"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

                {/* Travel & Parking Directions */}
                <div>
                  <h4 className="text-md font-semibold text-foreground mb-4">Travel & Parking Directions</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    These directions will be communicated by the voice agent during appointment reminder calls.
                  </p>
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="publicTransportInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🚌 Public Transport Instructions</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="e.g., Take bus 47 to Market Street, stop outside the library. Or Northern Line to Camden Town, 5 min walk from station."
                              rows={3}
                              data-testid="textarea-public-transport"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Bus routes, train/metro lines, and stations</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="parkingInstructions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>🅿️ Parking Information</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="e.g., Free parking available in the blue lot behind the building. Street parking on Oak Avenue (2-hour limit)."
                              rows={3}
                              data-testid="textarea-parking"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Where to park and any parking restrictions</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="arrivalNotes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>📍 Additional Arrival Notes</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field}
                              placeholder="e.g., Enter through the main entrance on High Street. Reception is on the 2nd floor."
                              rows={3}
                              data-testid="textarea-arrival-notes"
                            />
                          </FormControl>
                          <p className="text-xs text-muted-foreground">Walking directions, landmarks, entrance details</p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={saveConfigMutation.isPending}
                data-testid="button-save-config"
              >
                {saveConfigMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground mr-2"></div>
                    Saving...
                  </>
                ) : (
                  'Save Configuration'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
